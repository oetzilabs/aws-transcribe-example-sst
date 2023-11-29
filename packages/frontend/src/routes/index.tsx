import { A } from "solid-start";
import { createQuery, createMutation, useQueryClient } from "@tanstack/solid-query";
import { Queries } from "../utils/queries";
import { Mutations } from "../utils/mutations";
import { createSignal, For, Match, Show, Switch } from "solid-js";

export default function Home() {
  const queryClient = useQueryClient();

  const medias = createQuery(() => ({
    queryKey: ["media"],
    queryFn: () => {
      return Queries.Medias.all();
    },
    refetchOnWindowFocus: false,
    refetchInterval: 10_000,
  }));

  const uploadMedia = createMutation(() => ({
    mutationKey: ["media", "upload"],
    mutationFn: async (data: { file: File }) => {
      const res = await Mutations.Medias.getSignedUploadUrl(data.file.name);
      return Mutations.Medias.upload(res.url, data.file);
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries(medias);
    },
  }));

  const [files, setFiles] = createSignal<File[]>([]);

  let fileInput: HTMLInputElement;

  return (
    <div class="p-4 flex flex-col items-center justify-center w-full h-full gap-5">
      <h1>Home</h1>
      <div class="flex flex-row items-center justify-between w-full">
        <div class="flex flex-row items-center w-full">
          <h2 onClick={() => queryClient.invalidateQueries(medias)}>Medias</h2>
        </div>
        <div class="flex flex-row items-center gap-2.5 w-max">
          <input
            hidden
            type="file"
            ref={fileInput!}
            accept="video/*,audio/*"
            onChange={(e) => {
              if (e.target.files) {
                setFiles([...files(), ...Array.from(e.target.files)]);
              }
            }}
          />
          <button class="w-max" onClick={() => fileInput!.click()}>
            Select File
          </button>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-5 w-full">
        <For each={files()}>
          {(file) => (
            <div class="flex flex-row items-center justify-between w-full">
              <div class="flex flex-row items-center gap-2.5 w-full">
                <p class="text-xs">{file.name}</p>
                <button onClick={async () => await uploadMedia.mutateAsync({ file })}>Upload</button>
              </div>
            </div>
          )}
        </For>
      </div>
      <div class="grid grid-cols-3 gap-5 w-full">
        <Show when={medias.isLoading}>
          <div>Loading...</div>
        </Show>
        <Show when={medias.isError}>
          <div>Error</div>
        </Show>
        <Show when={medias.isSuccess}>
          <For each={medias.data}>
            {(file) => (
              <div class="flex flex-row items-center justify-between w-full">
                <div class="flex flex-row items-center gap-2.5">
                  <A href={file.id}>
                    <p class="text-xs">{file.id}</p>
                  </A>
                </div>
                <div>
                  <span class="text-xs text-gray-500">{Math.floor(file.size / (1024 * 1024))} MB</span>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
