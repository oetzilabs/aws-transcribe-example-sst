// @refresh reload
import { Suspense } from "solid-js";
import { useLocation, Body, ErrorBoundary, FileRoutes, Head, Html, Meta, Routes, Scripts, Title } from "solid-start";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import "./root.css";

const client = new QueryClient();

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        <Title>SolidStart - With TailwindCSS</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Body>
        <Suspense>
          <QueryClientProvider client={client}>
            <ErrorBoundary>
              <Routes>
                <FileRoutes />
              </Routes>
            </ErrorBoundary>
          </QueryClientProvider>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  );
}
