import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Screen, T } from '@/components/ui';
import { DAILY_FACTS, QUESTIONS } from '@/content/quiz';
import { dayKey, streak, useJournal } from '@/features/journal/store';

// Deterministic daily pick so everyone sees the same 3 questions/fact on a given day.
const seed = () => Number(dayKey().replace(/-/g, '')) ;
const todays = () => {
  const s = seed();
  return { fact: DAILY_FACTS[s % DAILY_FACTS.length], qs: [0, 1, 2].map((i) => QUESTIONS[(s + i) % QUESTIONS.length]) };
};

export default function Quiz() {
  const { t } = useTranslation();
  const { fact, qs } = todays();
  const quiz = useJournal((s) => s.quiz);
  const save = useJournal((s) => s.saveQuiz);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const doneToday = dayKey() in quiz;
  const finished = i >= qs.length;

  const next = () => {
    const nextScore = score + (picked === qs[i].answer ? 1 : 0);
    setScore(nextScore);
    setPicked(null);
    setI(i + 1);
    if (i + 1 >= qs.length) save(dayKey(), nextScore);
  };

  const days = Object.keys(quiz).map((d) => new Date(d).getTime());
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('quiz.title') }} />
      <Card><T.Overline>{t('quiz.fact')}</T.Overline><T.Head>{fact}</T.Head></Card>
      <T.Body>{t('quiz.streak', { count: streak(days) })}</T.Body>
      {doneToday && !finished ? <T.Body>{t('quiz.done', { score: quiz[dayKey()], total: qs.length })}</T.Body> : null}
      {!finished && !doneToday ? (
        <>
          <T.Overline>{t('quiz.question', { n: i + 1, total: qs.length })}</T.Overline>
          <T.Title style={{ fontSize: 22, lineHeight: 28 }}>{qs[i].q}</T.Title>
          {qs[i].options.map((o, k) => (
            <Button key={k} variant={picked === k ? 'primary' : 'secondary'} label={o} disabled={picked !== null} onPress={() => setPicked(k)} />
          ))}
          {picked !== null ? (
            <>
              <T.Body>{picked === qs[i].answer ? t('quiz.correct') : t('quiz.incorrect')} {qs[i].why}</T.Body>
              <Button label={t('common.continue')} onPress={next} />
            </>
          ) : null}
        </>
      ) : null}
      {finished ? <T.Head>{t('quiz.done', { score, total: qs.length })}</T.Head> : null}
    </Screen>
  );
}
