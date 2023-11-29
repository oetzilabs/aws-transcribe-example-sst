import { useNavigate } from "@solidjs/router";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { For, Match, Show, Switch, createSignal } from "solid-js";
import { A, useParams } from "solid-start";
import { Mutations } from "../../utils/mutations";
import { Queries } from "../../utils/queries";

export default function MediaPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const media = createQuery(() => ({
    queryKey: ["media", id],
    queryFn: () => {
      return Queries.Medias.get(id);
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  }));

  const transcript = createQuery(() => ({
    queryKey: ["media", id, "transcript"],
    queryFn: () => {
      return Queries.Transcripts.get(id);
    },
    refetchOnWindowFocus: false,
    refetchInterval: 10_000,
  }));

  const createTranscript = createMutation(() => ({
    mutationFn: async (data: { language: string; type: "audio" | "video" }) => {
      return Mutations.Transcripts.create(id, data.language, data.type);
    },
    mutationKey: ["media", id, "transcript", "create"],
    onSuccess: async (data) => {
      await queryClient.invalidateQueries(transcript);
    },
  }));

  const deleteMedia = createMutation(() => ({
    mutationFn: async () => {
      const conf = confirm("Are you sure you want to delete this media?");
      if (!conf) {
        throw new Error("User cancelled");
      }
      return Mutations.Medias.delete(id);
    },
    mutationKey: ["media", id, "delete"],
    onSuccess: async (data) => {
      await queryClient.invalidateQueries(media);
      await navigate("/");
    },
  }));

  const [view, setView] = createSignal<"detail" | "summary">("summary");

  return (
    <div class="flex flex-col items-center justify-center w-full h-full gap-5 py-10">
      <h1 class="text-2xl font-bold">{id}</h1>
      <Show when={media.isLoading}>Loading...</Show>
      <Show when={media.isError}>Error</Show>
      <Show when={media.isSuccess && media.data}>
        {(m) => (
          <div class="flex flex-col items-center justify-center w-full h-full gap-5">
            {m().contentType === "video/mp4" ? (
              <video controls class="container rounded-lg">
                <source src={m().link} type="video/mp4" />
              </video>
            ) : m().contentType === "audio/mpeg" ? (
              <audio controls class="container rounded-lg">
                <source src={m().link} type="audio/mpeg" />
              </audio>
            ) : (
              <div class="container bg-neutral-200 rounded-lg">Unsupported media type</div>
            )}
            <div>
              <div class="flex flex-row items-center gap-2.5 w-max">
                <button
                  class="w-max bg-neutral-200 rounded-lg p-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    createTranscript.isPending ||
                    (transcript.isSuccess &&
                      (transcript.data.status === "COMPLETED" || transcript.data.status === "IN_PROGRESS"))
                  }
                  onClick={async () => {
                    await createTranscript.mutateAsync({
                      language: "en-US",
                      type: m().contentType.includes("video") ? "video" : "audio",
                    });
                  }}
                >
                  Create Transcript (en-US)
                </button>
                <button
                  class="w-max bg-neutral-200 rounded-lg p-2 px-3"
                  disabled={createTranscript.isPending}
                  onClick={async () => {
                    await deleteMedia.mutateAsync();
                  }}
                >
                  Delete
                </button>
                <A
                  href={m().link}
                  class="w-max bg-neutral-200 rounded-lg p-2 px-3"
                  download={m().link.split("/").pop()}
                >
                  Download Video
                </A>
                <Show
                  when={
                    transcript.isSuccess && transcript.data.status === "COMPLETED" && transcript.data.transcriptLink
                  }
                >
                  {(tLink) => (
                    <A
                      href={tLink()}
                      class="w-max bg-neutral-200 rounded-lg p-2 px-3"
                      download={`${id}_transcript.json`}
                    >
                      Download Transcript
                    </A>
                  )}
                </Show>
              </div>
            </div>
            <div class="container flex flex-row items-center justify-between w-full gap-2.5">
              <div class="flex flex-row items-center overflow-x-auto w-full bg-neutral-200 rounded-lg p-6">
                <Show when={transcript.isPending}>One Second...</Show>
                <Show when={transcript.isLoading}>Loading...</Show>
                <Show when={transcript.isError}>Error</Show>
                <Show when={transcript.isSuccess && transcript.data}>
                  {(t) => (
                    <div class="flex flex-col gap-4 container">
                      <div class="flex flex-row justify-between items-center w-full">
                        <h2
                          class={`text-xl font-bold ${
                            t().status === "IN_PROGRESS" ? "text-yellow-500" : "text-teal-500"
                          }`}
                        >
                          Transcript
                        </h2>
                        <div class="flex flex-row gap-2.5 w-max">
                          <button
                            onClick={() => setView("summary")}
                            class={`bg-neutral-200 rounded-lg p-2 px-3 ${
                              view() === "summary" ? "bg-teal-500 text-white" : ""
                            }`}
                          >
                            Summary View
                          </button>
                          <button
                            class={`bg-neutral-200 rounded-lg p-2 px-3 ${
                              view() === "detail" ? "bg-teal-500 text-white" : ""
                            }`}
                            onClick={() => setView("detail")}
                          >
                            Detail View
                          </button>
                        </div>
                      </div>
                      <div class="flex flex-col flex-wrap w-full gap-2.5">
                        <For each={t().transcript}>
                          {(sentence) => (
                            <>
                              <Show when={view() === "detail"}>
                                <div class="flex flex-col gap-1">
                                  <span class="text-xs w-max">
                                    TS: {sentence.start_time} - {sentence.end_time}
                                  </span>
                                  <div class="flex flex-row w-full gap-1">
                                    <For each={sentence.words}>
                                      {(word) => (
                                        <div class="flex flex-col gap-1 bg-neutral-50 border border-neutral-300 rounded-lg px-2 py-1 w-max">
                                          <span class="font-medium">{word.content}</span>
                                          <Show when={word.start_time || word.end_time}>
                                            <span class="text-xs text-gray-500 w-max">
                                              TS: {word.start_time} - {word.end_time}
                                            </span>
                                          </Show>
                                          <Show when={[".", "!", "?"].includes(word.content)}>
                                            <span class="text-xs text-gray-500 w-max">Punctuation</span>
                                          </Show>
                                        </div>
                                      )}
                                    </For>
                                  </div>
                                </div>
                              </Show>
                              <Show when={view() === "summary"}>
                                <div class="flex flex-row gap-1">
                                  <div class="flex flex-col gap-1 bg-neutral-50 border border-neutral-300 rounded-lg px-2 py-1 w-max">
                                    <span class="font-medium">{sentence.words.map((w) => w.content).join(" ")}</span>
                                    <span class="text-xs">
                                      TS: {sentence.start_time} - {sentence.end_time}
                                    </span>
                                  </div>
                                </div>
                              </Show>
                            </>
                          )}
                        </For>
                      </div>
                    </div>
                  )}
                </Show>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
