import { render, screen } from "@testing-library/react";

import App from "./App";

test("preview pane toolbar uses compile button and no title text", () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /compile/i })).toBeInTheDocument();
  const titles = Array.from(document.querySelectorAll(".paneTitle")).map((n) => n.textContent ?? "");
  expect(titles.some((t) => /^preview$/i.test(t.trim()))).toBe(false);
});

test("layout exposes resize splitters", () => {
  render(<App />);
  expect(screen.getByRole("separator", { name: /resize sidebar/i })).toBeInTheDocument();
  expect(screen.getByRole("separator", { name: /resize editor/i })).toBeInTheDocument();
  expect(screen.getByRole("separator", { name: /resize assistant/i })).toBeInTheDocument();
});
