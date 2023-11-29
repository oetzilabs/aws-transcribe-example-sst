import { z } from "zod";
import { TranscribeClient, ListTranscriptionJobsCommand, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Queue } from "sst/node/queue";
import { TranscribeResultZod, highestConfidence, safeParseTranscriptResult } from "./utils";

export * as Transcribe from "./transcribe";

export const process = z.function(z.tuple([TranscribeResultZod])).implement(async (input) => {
  let sentences: Array<{
    start_time: string;
    end_time: string;
    words: Array<{ content: string; confidence: number; start_time: string; end_time: string }>;
  }> = [];
  let words: Array<{ content: string; confidence: number; start_time: string; end_time: string }> = [];
  for (let i = 0; i < input.results.items.length; i++) {
    const item = input.results.items[i];
    if (!item) continue;
    const { start_time, end_time } = item;
    if (!item.alternatives) continue;
    const { content, confidence } = highestConfidence(item.alternatives);
    words.push({ content, confidence: Number(confidence), start_time: start_time || "", end_time: end_time || "" });
    const punctiation = content === "." || content === "!" || content === "?";
    if (punctiation) {
      sentences.push({
        end_time: words.slice(-2)[0].end_time ?? "no end time",
        start_time: words[0].start_time,
        words: words,
      });
      words = [];
    }
  }

  return sentences;
});

export const get = z.function(z.tuple([z.string()])).implement(async (id) => {
  const transcribeClient = new TranscribeClient({ region: "eu-central-1" });
  const transcribeCommand = new GetTranscriptionJobCommand({
    TranscriptionJobName: id,
  });
  const job = await transcribeClient.send(transcribeCommand);
  const result = job.TranscriptionJob;
  if (!result) throw new Error("No transcription job");
  const { TranscriptionJobStatus, CreationTime, CompletionTime, Transcript: TS } = result;
  if (TranscriptionJobStatus !== "COMPLETED") return { status: TranscriptionJobStatus, started: CreationTime };
  if (TranscriptionJobStatus === "COMPLETED" && !TS) throw new Error("No transcript");
  if (!TS) throw new Error("No transcript");
  const { TranscriptFileUri } = TS;
  if (!TranscriptFileUri) throw new Error("No transcript file uri");
  const transcriptFile = await fetch(TranscriptFileUri);
  const jsonResponse = await transcriptFile.json();
  const validation2 = safeParseTranscriptResult(jsonResponse);
  if (!validation2.success) throw new Error("Invalid transcript");
  const transcript = await process(validation2.data);
  return {
    status: TranscriptionJobStatus,
    started: CreationTime,
    completed: CompletionTime,
    transcript: transcript,
    transcriptLink: TranscriptFileUri,
  };
});

export const all = z.function(z.tuple([])).implement(async () => {
  const transcribeClient = new TranscribeClient({ region: "eu-central-1" });
  const transcribeCommand = new ListTranscriptionJobsCommand({});
  const jobs = await transcribeClient.send(transcribeCommand);
  const summeries = jobs.TranscriptionJobSummaries;
  if (!summeries) return [];
  const result = summeries.map((summary) => {
    const { TranscriptionJobName, CreationTime, CompletionTime, TranscriptionJobStatus } = summary;
    return {
      id: TranscriptionJobName,
      status: TranscriptionJobStatus,
      started: CreationTime,
      completed: CompletionTime,
    };
  });

  return result;
});

export const create = z.function(z.tuple([z.any()])).implement(async (input) => {
  const sqsClient = new SQSClient({ region: "eu-central-1" });
  const sqsCommand = new SendMessageCommand({
    QueueUrl: Queue["queue"].queueUrl,
    MessageBody: JSON.stringify(input),
  });
  const result = await sqsClient.send(sqsCommand);
  const { MessageId, SequenceNumber } = result;
  return { MessageId, SequenceNumber };
});
