import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectShortLyric } from '../../supabase/functions/_shared/shortLyrics.ts';
test('15s and 30s have separate word budgets and count chorus repetitions',()=>{
 assert(inspectShortLyric('A little song just for you',15).valid);
 assert(!inspectShortLyric('word '.repeat(21),15).valid);
 assert(inspectShortLyric('word '.repeat(21),30).valid);
 assert(!inspectShortLyric('word '.repeat(41),30).valid);
});
test('section labels do not count as singing; full song sections are rejected',()=>{
 assert(inspectShortLyric('[Verse]\nUma canção\nPara lembrar',15).valid);
 assert(!inspectShortLyric('one\ntwo\nthree\nfour\nfive',15).valid);
 assert(!inspectShortLyric('one\ntwo\nthree\nfour\nfive\nsix\nseven',30).valid);
 assert(!inspectShortLyric('[Verse]\n',30).valid);
});
