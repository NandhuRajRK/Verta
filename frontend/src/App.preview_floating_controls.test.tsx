import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";

import App from "./App";

test("preview shows floating bottom controls when a PDF exists", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /^compile$/i }));

  const controls = await screen.findByRole("group", { name: /preview controls/i });
  expect(within(controls).getByRole("button", { name: /undo/i })).toBeInTheDocument();
  expect(within(controls).getByRole("button", { name: /redo/i })).toBeInTheDocument();
  expect(within(controls).getByRole("button", { name: /previous page/i })).toBeInTheDocument();
  expect(within(controls).getByRole("button", { name: /next page/i })).toBeInTheDocument();
});
