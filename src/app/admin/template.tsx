"use client";

import { motion } from "motion/react";

/** Re-mounts on every admin navigation: the new page cross-fades in (one shot). */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
