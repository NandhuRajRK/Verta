import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";

test("sidebar shows top controls and user avatar", () => {
  render(<App />);

  expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /view toggles/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/user avatar/i)).toBeInTheDocument();
});

test("can collapse and expand sidebar", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /view toggles/i }));
  await user.click(screen.getByRole("button", { name: /sidebar/i }));
  expect(screen.queryByRole("navigation", { name: /files/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /expand/i }));
  expect(screen.getByRole("navigation", { name: /files/i })).toBeInTheDocument();
});
