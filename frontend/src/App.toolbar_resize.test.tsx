import { render, screen } from "@testing-library/react";

import App from "./App";

test("layout exposes resize splitters", () => {
  render(<App />);
  expect(screen.getByRole("separator", { name: /resize sidebar/i })).toBeInTheDocument();
  expect(screen.getByRole("separator", { name: /resize editor/i })).toBeInTheDocument();
  expect(screen.getByRole("separator", { name: /resize assistant/i })).toBeInTheDocument();
});
