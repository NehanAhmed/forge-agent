import fs from 'fs';
import { execSync } from 'child_process';

export function runBash(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', timeout: 10_000 });
  } catch (err: any) {
    return `ERROR: ${err.stdout ?? ''}${err.stderr ?? err.message}`;
  }
}

export function readFile(path: string): string {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

export function writeFile(path: string, content: string): string {
  try {
    fs.writeFileSync(path, content, 'utf-8');
    return `File written successfully to ${path}`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
}

export function editFile(path: string,oldContent: string, newContent: string): string {
    try {
        const content = fs.readFileSync(path, 'utf-8');
        const occurences = content.split(oldContent).length - 1;
        if (occurences === 0) {
            return `ERROR: The string "${oldContent}" was not found in the file.`;
        }
        const updatedContent = content.replace(oldContent, newContent);
        fs.writeFileSync(path, updatedContent, 'utf-8');
        return `Successfully replaced ${occurences} occurence(s) of "${oldContent}" with "${newContent}" in ${path}`;
    }catch (err: any) {
       return `ERROR: ${err.message}`;
    }

}
export const toolExecutors: Record<string, (args: any) => string> = {
  run_bash: (args) => runBash(args.command),
  read_file: (args) => readFile(args.path),
  write_file: (args) => writeFile(args.path, args.content),
  replace_string_in_file: (args) => editFile(args.path, args.stringToReplace, args.newString),
};