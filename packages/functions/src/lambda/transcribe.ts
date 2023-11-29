import {
  LanguageCode,
  ListTranscriptionJobsCommand,
  MediaFormat,
  StartTranscriptionJobCommand,
  TranscribeClient,
  BadRequestException,
} from "@aws-sdk/client-transcribe";
import { Transcribe } from "@aws-transcribe-example-sst/core/transcribe";
import { SQSEvent } from "aws-lambda";
import { ApiHandler, useFormData, usePathParam } from "sst/node/api";
import { z } from "zod";
import { error, json } from "../utils";
import { Bucket } from "sst/node/bucket";
import { StatusCodes } from "http-status-codes";
import { TranscribeUtils } from "@aws-transcribe-example-sst/core/utils";

export const create = ApiHandler(async () => {
  const form = useFormData();
  if (!form) return error("No form data");
  const d = Object.fromEntries(form.entries());
  const data = TranscribeUtils.safeParse<LanguageCode>()(d);
  if (!data.success) return error(data.error);

  try {
    const result = await Transcribe.create(data.data);
    return json(result);
  } catch (e) {
    return error({
      message: "Failed to send message",
      error: e,
    });
  }
});

export const all = ApiHandler(async () => {
  const jobs = await Transcribe.all();
  return json(jobs);
});

export const get = ApiHandler(async () => {
  const id = usePathParam("id");
  if (!id) return error("No id provided");
  const validation = z.string().safeParse(id);
  if (!validation.success) return error("Invalid id provided");
  try {
    const job = await Transcribe.get(validation.data);
    return json(job);
  } catch (e) {
    if (e instanceof BadRequestException) return error("Speech recognition failed", StatusCodes.BAD_REQUEST);
    return error(e);
  }
});

export const process = async (event: SQSEvent) => {
  const retries = event.Records.map((record) => Number(record.attributes.ApproximateReceiveCount));
  const maxRetries = 1;
  const retry = retries.some((count) => count > maxRetries);
  if (retry) return error("Max retries reached");
  const bodies = event.Records.map((record) => JSON.parse(record.body));
  const validation = TranscribeUtils.safeParseSQS<LanguageCode>()(bodies);
  if (!validation.success) return error("Invalid SQS event");
  const transcribeClient = new TranscribeClient({ region: "eu-central-1" });
  for (const data of validation.data) {
    const transcribeCommand = new ListTranscriptionJobsCommand({
      JobNameContains: data.id,
    });

    const jobs = await transcribeClient.send(transcribeCommand);
    const summeries = jobs.TranscriptionJobSummaries;
    if (!summeries) {
      continue;
    }
    if (summeries.length) {
      return error("Job already exists");
    }
  }
  const results = await Promise.all(
    validation.data.map(async (data) => {
      const mediaFormat = data.id.split(".").pop();
      if (!mediaFormat) return error("Invalid media format");
      const transcribeCommand = new StartTranscriptionJobCommand({
        LanguageCode: data.language,
        Media: {
          MediaFileUri: `s3://${Bucket["bucket"].bucketName}/media/${data.id}`,
        },
        MediaFormat: mediaFormat as MediaFormat,
        TranscriptionJobName: data.id,
      });

      const result = await transcribeClient.send(transcribeCommand);
      const j = result.TranscriptionJob;
      if (!j) return error("No transcription job");
      return {
        id: data.id,
        result: {
          status: j.TranscriptionJobStatus,
          started: j.CreationTime,
        },
      };
    })
  );
  return json(results);
};
