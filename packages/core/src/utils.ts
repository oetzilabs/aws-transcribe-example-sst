import { z } from "zod";

export * as TranscribeUtils from "./utils";

export const TranscribeZod = <Language>() =>
  z.object({
    type: z.union([z.literal("audio"), z.literal("video")]),
    language: z.custom<Language>(),
    id: z.string(),
  });

export const TranscribeResultZod = z.object({
  jobName: z.string(),
  accountId: z.string(),
  results: z.object({
    transcripts: z.array(
      z.object({
        transcript: z.string(),
      })
    ),
    items: z.array(
      z.object({
        start_time: z.string().optional(),
        end_time: z.string().optional(),
        alternatives: z.array(
          z.object({
            confidence: z.string(),
            content: z.string(),
          })
        ),
      })
    ),
  }),
});

export const safeParseTranscriptResult = TranscribeResultZod.safeParse;

export const safeParse = <L>() => TranscribeZod<L>().safeParse;

export const safeParseSQS = <L>() => z.array(TranscribeZod<L>()).safeParse;

export const highestConfidence = (
  alternatives: z.infer<typeof TranscribeResultZod>["results"]["items"][number]["alternatives"]
) => {
  // do while
  let highest = alternatives[0];
  for (let i = 1; i < alternatives.length; i++) {
    const alternative = alternatives[i];
    if (Number(alternative.confidence) > Number(highest.confidence)) highest = alternative;
  }

  return highest;
};
