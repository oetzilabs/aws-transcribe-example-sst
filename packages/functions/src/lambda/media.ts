import { Media } from "@aws-transcribe-example-sst/core/media";
import { ApiHandler, useBody, useFormData, usePathParam } from "sst/node/api";
import { z } from "zod";
import { error, json } from "../utils";

export const all = ApiHandler(async () => {
  const medias = await Media.all();
  return json(medias);
});

export const get = ApiHandler(async () => {
  const id = usePathParam("id");
  if (!id) return error("No id provided");
  const validation = z.string().safeParse(id);
  if (!validation.success) return error("Invalid id provided");
  try {
    const media = await Media.get(validation.data);
    return json(media);
  } catch (e) {
    return error("No media found");
  }
});

export const getSignedUploadUrl = ApiHandler(async () => {
  const body = useBody();
  if (!body) return error("No form data");
  const data = JSON.parse(body);
  const validation = z.object({ id: z.string() }).safeParse(data);
  if (!validation.success) return error("Invalid id provided");
  const url = await Media.getSignedUploadUrl(validation.data.id);
  return json(url);
});

export const remove = ApiHandler(async () => {
  const id = usePathParam("id");
  if (!id) return error("No id provided");
  const validation = z.string().safeParse(id);
  if (!validation.success) return error("Invalid id provided");
  try {
    const response = await Media.remove(validation.data);
    return json({ success: response });
  } catch (e) {
    if (e instanceof Error) return error(`Delete for '${id}' failed: ${e.message}`);
    return error(`Delete for '${id}' failed, unknown error`);
  }
});
