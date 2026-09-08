#!/usr/bin/env python3
"""Decode the puzzle bank of the 1990 DOS release of Treasure Mountain!

The game ships its 360 riddles in ALL_PUZS, compressed against a fixed dictionary in PRG_DICT:

  * PRG_DICT is a flat array of 16-byte, NUL-padded words (208 of them).
  * In ALL_PUZS, a byte >= 0x80 is a dictionary reference to word (byte - 0x80);
    bytes < 0x80 are literal ASCII; 0x0D ends a line; 0x00 ends a puzzle.
  * A puzzle is: prompt lines, then '~', then the correct answer, then two decoys.
  * Backticked words are drawn in red by the game; '____' marks the blank.

Usage:  python3 decode_puzzles.py /path/to/SSTM            # prints all 360 puzzles

The game files are not redistributed here; fetch them from
https://archive.org/details/msdos_Super_Solvers_Treasure_Mountain_1990

The riddles are The Learning Company's work and none of them ship in this remake; this decoder
exists so the research notes in treasure-mountain.md can be checked against the source.
"""
import sys
import os


def load_dictionary(path):
    data = open(os.path.join(path, 'PRG_DICT'), 'rb').read()
    return [data[i:i + 16].split(b'\x00')[0].decode('latin-1') for i in range(0, len(data), 16)]


def decode(path):
    words = load_dictionary(path)
    raw = open(os.path.join(path, 'ALL_PUZS'), 'rb').read()
    out = []
    for byte in raw:
        if byte >= 0x80:
            index = byte - 0x80
            out.append(words[index] if index < len(words) else '<%d>' % index)
        elif byte == 0x0D:
            out.append('\n')
        elif byte == 0x00:
            out.append('\x00')
        else:
            out.append(chr(byte))
    text = ''.join(out)
    # The file opens with a table of 16-bit offsets; the first puzzle follows it.
    start = text.find('  `Dad, hid')
    puzzles = []
    for chunk in text[start:].split('\x00'):
        if '~' not in chunk:
            continue
        prompt, choices = chunk.split('~', 1)
        lines = [l.strip() for l in prompt.strip('\n').split('\n') if l.strip()]
        # 0x1A (^Z) is a padding byte the game ignores.
        picks = [c.strip() for c in choices.strip('\n').split('\n') if c.strip() and c.strip() != '\x1a']
        puzzles.append((lines, picks))
    return puzzles


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else '.'
    puzzles = decode(path)
    print('%d puzzles\n' % len(puzzles))
    for lines, picks in puzzles:
        print('\n'.join(lines))
        print('   answer: %s   decoys: %s' % (picks[0], ', '.join(picks[1:])))
        print('-' * 60)


if __name__ == '__main__':
    main()
