"use client";

import { useEffect, useRef, useState } from "react";

interface InjazatiFrameProps {
  html: string;
}

export function InjazatiFrame({ html }: InjazatiFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(2400);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    let intervalId: number | undefined;
    let observer: ResizeObserver | undefined;

    const syncHeight = () => {
      const doc = iframe.contentDocument;
      if (!doc) {
        return;
      }

      const nextHeight = Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0,
        1200
      );

      setHeight(nextHeight + 24);
    };

    const attachWatchers = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body || !doc.documentElement) {
        return;
      }

      syncHeight();
      observer = new ResizeObserver(syncHeight);
      observer.observe(doc.body);
      observer.observe(doc.documentElement);
      intervalId = window.setInterval(syncHeight, 1000);
      iframe.contentWindow?.addEventListener("hashchange", syncHeight);
    };

    iframe.addEventListener("load", attachWatchers, { once: true });

    return () => {
      observer?.disconnect();
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      iframe.contentWindow?.removeEventListener("hashchange", syncHeight);
    };
  }, [html]);

  return (
    <section className="injazati-frame-card">
      <iframe
        ref={iframeRef}
        className="injazati-frame"
        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
        srcDoc={html}
        style={{ height }}
        title="إنجازاتي"
      />
    </section>
  );
}
