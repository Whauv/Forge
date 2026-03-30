"use client";

type ProgressBarProps = {
  active: boolean;
};

export function ProgressBar({ active }: ProgressBarProps) {
  return (
    <div
      className={`overflow-hidden rounded-full border border-line bg-background/70 transition-opacity dark:bg-background/35 ${
        active ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!active}
    >
      <div
        className={`h-2 rounded-full bg-[linear-gradient(90deg,_#ff7a18,_#ffb276,_#ff7a18)] bg-[length:200%_100%] transition-all duration-300 ${
          active ? "w-full animate-[autopilot-progress_1.2s_linear_infinite]" : "w-0"
        }`}
      />
    </div>
  );
}
