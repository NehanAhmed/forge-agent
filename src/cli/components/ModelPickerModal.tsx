import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import type { ModelInfo } from '../../core/models.js';
import { computeModelPickerLayout, filterModels } from '../../ui/model-picker.js';
import { createGlyphs, createTheme, type Glyphs, type Theme } from '../../ui/theme.js';
import { cellWidth, fitCells, sanitizeText, truncateCells } from '../../ui/text.js';

export interface ModelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  currentModelId: string;
  models: ModelInfo[];
  /** Override the terminal size (the dashboard passes its resolved layout). */
  width?: number;
  height?: number;
  theme?: Theme;
  glyphs?: Glyphs;
  ascii?: boolean;
}

const FALLBACK_COLUMNS = 80;
const FALLBACK_ROWS = 24;
const MAX_FILTER_LENGTH = 64;

export function ModelPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentModelId,
  models,
  width,
  height,
  theme,
  glyphs,
  ascii = false,
}: ModelPickerModalProps) {
  const terminalSize = useWindowSize();
  const columns = Math.max(1, width ?? terminalSize.columns ?? FALLBACK_COLUMNS);
  const rows = Math.max(1, height ?? terminalSize.rows ?? FALLBACK_ROWS);
  const activeTheme = useMemo(() => theme ?? createTheme(), [theme]);
  const activeGlyphs = useMemo(() => glyphs ?? createGlyphs(ascii), [glyphs, ascii]);

  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wasOpen = useRef(false);

  const filteredModels = useMemo(() => filterModels(models, filter), [models, filter]);
  const layout = useMemo(
    () => computeModelPickerLayout(columns, rows, filteredModels.length, selectedIndex),
    [columns, rows, filteredModels.length, selectedIndex],
  );

  // Start on the active model and clear any filter each time the modal opens.
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setFilter('');
      const currentIndex = models.findIndex(model => model.id === currentModelId);
      setSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
    wasOpen.current = isOpen;
  }, [isOpen, models, currentModelId]);

  // Keep the cursor valid if the model catalog or the filter result shrinks.
  useEffect(() => {
    setSelectedIndex(index => Math.min(index, Math.max(0, filteredModels.length - 1)));
  }, [filteredModels.length]);

  const selectAt = (index: number) => {
    const model = filteredModels[index];
    if (model) onSelect(model.id);
  };

  const moveBy = (delta: number) => {
    if (filteredModels.length === 0) return;
    setSelectedIndex(index => Math.min(Math.max(0, filteredModels.length - 1), Math.max(0, index + delta)));
  };

  const appendFilter = (text: string) => {
    setFilter(previous => (previous + text).slice(0, MAX_FILTER_LENGTH));
    setSelectedIndex(0);
  };

  const removeLastFilterChar = () => {
    setFilter(previous => previous.slice(0, -1));
    setSelectedIndex(0);
  };

  const clearFilter = () => {
    setFilter('');
    setSelectedIndex(0);
  };

  useInput(
    (inputChar, key) => {
      if (key.escape) {
        onClose();
        return;
      }

      if (key.upArrow) {
        moveBy(-1);
        return;
      }
      if (key.downArrow) {
        moveBy(1);
        return;
      }
      if (key.pageUp) {
        moveBy(-Math.max(1, layout.listRows));
        return;
      }
      if (key.pageDown) {
        moveBy(Math.max(1, layout.listRows));
        return;
      }
      if (key.home) {
        setSelectedIndex(0);
        return;
      }
      if (key.end) {
        setSelectedIndex(Math.max(0, filteredModels.length - 1));
        return;
      }
      if (key.return) {
        selectAt(selectedIndex);
        return;
      }
      if (key.backspace || key.delete) {
        removeLastFilterChar();
        return;
      }
      if (key.ctrl && inputChar.toLowerCase() === 'u') {
        clearFilter();
        return;
      }
      if (key.ctrl || key.meta || key.tab || !inputChar) {
        return;
      }

      const text = sanitizeText(inputChar).replace(/\r\n?|\n|\t/g, ' ');
      if (text) appendFilter(text);
    },
    { isActive: isOpen },
  );

  if (!isOpen) return null;

  const current = filteredModels[selectedIndex];
  const visibleModels = filteredModels.slice(layout.scrollTop, layout.scrollTop + layout.visibleCount);
  const currentModelName = models.find(model => model.id === currentModelId)?.name ?? currentModelId;
  const currentGlyph = ascii ? '*' : '●';
  const cursor = ascii ? '_' : '▌';
  const upDown = ascii ? 'up/down' : '↑↓';
  const dot = ascii ? ' | ' : ' · ';
  const hint =
    layout.contentWidth >= 48
      ? `${upDown} move${dot}enter select${dot}esc close`
      : layout.contentWidth >= 28
        ? `${upDown}${dot}enter${dot}esc`
        : `${upDown} enter esc`;
  const titleWidth = Math.max(1, layout.contentWidth - cellWidth(hint) - 1);
  const filterPrefix = 'filter: ';
  const filterValueWidth = Math.max(1, layout.contentWidth - cellWidth(filterPrefix) - 1);
  const position =
    filteredModels.length > 0 ? `${selectedIndex + 1}/${filteredModels.length}` : `0/${Math.max(0, models.length)}`;
  const footer =
    layout.contentWidth >= 52
      ? `current: ${currentModelName}${dot}${position}`
      : filteredModels.length > layout.listRows
        ? `${position}${dot}${upDown} scroll`
        : position;
  const emptyText = filter
    ? `No models match "${filter}"`
    : models.length === 0
      ? 'No models available'
      : 'No matching models';

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
      aria-label="Select model"
    >
      <Box
        flexDirection="column"
        width={layout.width}
        height={layout.height}
        borderStyle={layout.bordered ? 'round' : undefined}
        borderColor={activeTheme.accent}
        paddingX={layout.paddingX}
        overflow="hidden"
      >
        {layout.showHeader && (
          <Box width={layout.contentWidth}>
            <Text bold color={activeTheme.accent}>
              {fitCells('Select model', titleWidth)}
            </Text>
            <Text dimColor>{truncateCells(hint, Math.max(1, layout.contentWidth - titleWidth))}</Text>
          </Box>
        )}

        {layout.showFilter && (
          <Box width={layout.contentWidth}>
            <Text dimColor>{filterPrefix}</Text>
            <Text>{fitCells(filter + cursor, filterValueWidth)}</Text>
          </Box>
        )}

        <Box flexDirection="column" width={layout.contentWidth} height={layout.listHeight} overflow="hidden">
          {filteredModels.length === 0 ? (
            <Text dimColor wrap="truncate">
              {fitCells(emptyText, layout.contentWidth)}
            </Text>
          ) : (
            visibleModels.map((model, index) => {
              const absoluteIndex = layout.scrollTop + index;
              const selected = absoluteIndex === selectedIndex;
              const isCurrent = model.id === currentModelId;
              const marker = isCurrent ? ` ${currentGlyph}` : '';
              const line = `${selected ? activeGlyphs.selected : ' '} ${model.name}${marker}`;

              return (
                <Box key={model.id} width={layout.contentWidth} aria-state={{ selected }}>
                  <Text
                    inverse={selected}
                    bold={selected}
                    color={selected ? activeTheme.focus : isCurrent ? activeTheme.success : undefined}
                    wrap="truncate"
                  >
                    {fitCells(line, layout.contentWidth)}
                  </Text>
                </Box>
              );
            })
          )}
        </Box>

        {layout.showDescription && (
          <Text dimColor wrap="truncate">
            {fitCells(current?.description || current?.id || '', layout.contentWidth)}
          </Text>
        )}

        {layout.showFooter && (
          <Text dimColor wrap="truncate">
            {fitCells(footer, layout.contentWidth)}
          </Text>
        )}
      </Box>
    </Box>
  );
}
