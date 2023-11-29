import { z } from "zod";
import { Media } from "@aws-transcribe-example-sst/core/src/media";
import { Transcribe } from "@aws-transcribe-example-sst/core/src/transcribe";

const API_BASE = import.meta.env.VITE_API_BASE as string;

export * as Queries from "./queries";

export const Medias = {
  all: z
    .function(z.tuple([]))
    .implement(() => fetch(`${API_BASE}/media/all`).then((res) => res.json() as ReturnType<typeof Media.all>)),
  get: z
    .function(z.tuple([z.string()]))
    .implement((id) => fetch(`${API_BASE}/media/${id}`).then((res) => res.json() as ReturnType<typeof Media.get>)),
} as const;

export const Transcripts = {
  get: z
    .function(z.tuple([z.string()]))
    .implement((id) =>
      fetch(`${API_BASE}/transcript/${id}`).then((res) => res.json() as ReturnType<typeof Transcribe.get>)
    ),
} as const;
