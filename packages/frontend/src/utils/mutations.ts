import { z } from "zod";
import { Media } from "@aws-transcribe-example-sst/core/src/media";
import { Transcribe } from "@aws-transcribe-example-sst/core/transcribe";

export * as Mutations from "./mutations";

const API_BASE = import.meta.env.VITE_API_BASE;

export const Medias = {
  getSignedUploadUrl: z.function(z.tuple([z.string()])).implement((id) => {
    let ids = id.split(".");

    ids[0] = ids[0].replace(/[^\w\d]/g, "_");
    let id_ = ids.join(".");

    return fetch(`${API_BASE}/media/signed`, {
      method: "POST",
      body: JSON.stringify({ id: id_ }),
    }).then((res) => res.json() as ReturnType<typeof Media.getSignedUploadUrl>);
  }),
  upload: z
    .function(z.tuple([z.string().url(), z.any()]))
    .implement((url, file) => fetch(url, { method: "PUT", body: file })),
  delete: z.function(z.tuple([z.string()])).implement((id) => fetch(`${API_BASE}/media/${id}`, { method: "DELETE" })),
} as const;

export const Transcripts = {
  create: z
    .function(z.tuple([z.string(), z.string(), z.union([z.literal("audio"), z.literal("video")])]))
    .implement((id, language, type) =>
      fetch(`${API_BASE}/transcript`, {
        method: "POST",
        body: new URLSearchParams({ id, language, type }),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json() as ReturnType<typeof Transcribe.create>)
    ),
  all: z
    .function(z.tuple([]))
    .implement(() =>
      fetch(`${API_BASE}/transcript/all`).then((res) => res.json() as ReturnType<typeof Transcribe.all>)
    ),
  get: z
    .function(z.tuple([z.string()]))
    .implement((id) =>
      fetch(`${API_BASE}/transcript/${id}`).then((res) => res.json() as ReturnType<typeof Transcribe.get>)
    ),
} as const;
