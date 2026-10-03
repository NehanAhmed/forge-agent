import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ModelInfo } from '../../core/models.js';

interface ModelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  currentModelId: string;
  models: ModelInfo[];
}

const ITEM_HEIGHT = 2; // paddingY + content
const CHROME_HEIGHT = 8; // header + filter + description + footer + borders + padding
const MIN_WIDTH = 50;
const MAX_WIDTH = 90;
const FALLBACK_COLUMNS = 80;
const FALLBACK_ROWS = 24;

function getTermDimensions() {
  try {
    return { columns: process.stdout.columns ?? FALLBACK_COLUMNS, rows: process.stdout.rows ?? FALLBACK_ROWS };
  } catch {
    return { columns: FALLBACK_COLUMNS, rows: FALLBACK_ROWS };
  }
}

export function ModelPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentModelId,
  models,
}: ModelPickerModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const [dimensions, setDimensions] = useState(getTermDimensions());

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => setDimensions(getTermDimensions());
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  const filteredModels = models.filter(
    m => m.name.toLowerCase().includes(filter.toLowerCase()) ||
         m.description.toLowerCase().includes(filter.toLowerCase()) ||
         m.id.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Clamp selected index to filtered models
  useEffect(() => {
    setSelectedIndex(prev => Math.min(prev, Math.max(0, filteredModels.length - 1)));
  }, [filteredModels.length]);

  const handleKeyPress = (input: string, key: { upArrow?: boolean; downArrow?: boolean; return?: boolean; escape?: boolean; backspace?: boolean; }) => {
    if (!isOpenRef.current) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredModels.length - 1, prev + 1));
      return;
    }
    if (key.return) {
      if (filteredModels[selectedIndex]) {
        onSelect(filteredModels[selectedIndex].id);
      }
      return;
    }
    if (key.escape) {
      onClose();
      return;
    }
    if (key.backspace) {
      setFilter(prev => prev.slice(0, -1));
      return;
    }
    if (input && input.length === 1 && !key.upArrow && !key.downArrow && !key.return && !key.escape && !key.backspace) {
      setFilter(prev => prev + input);
    }
  };

  useInput(handleKeyPress);

  if (!isOpen) return null;

  const currentModel = filteredModels[selectedIndex];

  // Responsive dimensions
  const termWidth = dimensions.columns;
  const termHeight = dimensions.rows;
  const modalWidth = Math.min(Math.max(Math.floor(termWidth * 0.7), MIN_WIDTH), MAX_WIDTH, termWidth - 4);
  const maxListHeight = Math.max(3, termHeight - CHROME_HEIGHT - 4);
  const listHeight = Math.min(filteredModels.length * ITEM_HEIGHT, maxListHeight);
  const modalHeight = Math.min(CHROME_HEIGHT + listHeight, termHeight - 2);

  // Scroll logic for long lists
  const scrollTop = selectedIndex >= Math.floor(listHeight / ITEM_HEIGHT) 
    ? selectedIndex - Math.floor(listHeight / ITEM_HEIGHT) + 1 
    : 0;
  const visibleModels = filteredModels.slice(scrollTop, scrollTop + Math.ceil(listHeight / ITEM_HEIGHT));

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        flexDirection="column"
        width={modalWidth}
        height={modalHeight}
        borderStyle="round"
        borderColor="cyan"
        padding={1}
        backgroundColor="black"
      >
        <Box flexDirection="row" alignItems="center" marginBottom={1}>
          <Text bold color="cyanBright"> Select Model </Text>
          <Text dimColor> (↑/↓ Enter Esc type:filter) </Text>
        </Box>
        
        <Box marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text>Filter: </Text>
          <Text color="white">{filter}</Text>
          <Text dimColor>{filter.length < 30 ? '_' : ''}</Text>
        </Box>

        <Box flexDirection="column" height={listHeight}>
          {filteredModels.length === 0 ? (
            <Box flexDirection="column" justifyContent="center" alignItems="center" flexGrow={1}>
              <Text dimColor>No models match "{filter}"</Text>
            </Box>
          ) : (
            visibleModels.map((model, idx) => {
              const absoluteIndex = scrollTop + idx;
              const isSelected = absoluteIndex === selectedIndex;
              const isCurrent = currentModelId === model.id;
              return (
                <Box
                  key={model.id}
                  flexDirection="row"
                  paddingX={1}
                  paddingY={1}
                  backgroundColor={isSelected ? 'blue' : 'transparent'}
                >
                  <Text color={isSelected ? 'white' : isCurrent ? 'green' : 'gray'}>
                    {isSelected ? '► ' : '  '}
                  </Text>
                  <Text
                    bold={isSelected}
                    color={isCurrent ? 'green' : isSelected ? 'white' : 'white'}
                  >
                    {model.name}
                    {isCurrent && <Text color="green" dimColor> ●</Text>}
                  </Text>
                </Box>
              );
            })
          )}
        </Box>

        {currentModel && (
          <Box marginTop={1} paddingX={1} borderStyle="single" borderColor="gray" flexDirection="column">
            <Text dimColor>{currentModel.description}</Text>
          </Box>
        )}

        {filteredModels.length > Math.ceil(listHeight / ITEM_HEIGHT) && (
          <Box marginTop={1} flexDirection="row" justifyContent="space-between" paddingX={1}>
            <Text dimColor>▲ {scrollTop + 1}-{Math.min(scrollTop + visibleModels.length, filteredModels.length)} of {filteredModels.length}</Text>
            <Text dimColor>{selectedIndex + 1}/{filteredModels.length}</Text>
          </Box>
        )}

        <Box marginTop={1} flexDirection="row" justifyContent="space-between">
          <Text dimColor>{filteredModels.length} model(s)</Text>
          <Text dimColor>W:{modalWidth} H:{modalHeight}</Text>
        </Box>
      </Box>
    </Box>
  );
}