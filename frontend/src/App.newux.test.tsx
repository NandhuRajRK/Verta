import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";

test("editor top bar shows edit button and chat tabs", async () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /new chat/i })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /assistant/i })).toBeInTheDocument();
});

test("assistant has clear and pin controls", async () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /clear conversation/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /pin to bottom/i })).toBeInTheDocument();
});

test("tools button opens the tools sidebar tabs", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: /tools/i }));
  expect(await screen.findByRole("tab", { name: /project info/i })).toBeInTheDocument();
});
