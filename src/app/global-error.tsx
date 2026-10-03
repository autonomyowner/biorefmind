"use client";

/** Last resort when the root layout itself fails: plain page, own html and body. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#d9e7f3",
          color: "#071733",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>Something went wrong. Please try again.</h1>
        <p style={{ margin: 0 }} lang="ar" dir="rtl">
          حدث خطأ ما. حاول مرة أخرى.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{ height: 44, padding: "0 24px", borderRadius: 999, border: 0, background: "#04173a", color: "#f3f8fc", fontSize: 15, cursor: "pointer" }}
        >
          Try again · حاول مجددًا
        </button>
      </body>
    </html>
  );
}
