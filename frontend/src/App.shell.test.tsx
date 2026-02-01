import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";

import App from "./App";

test("renders editor shell with files, editor, assistant, and preview panes", async () => {
  const user = userEvent.setup();
  render(<App />);

  // Welcome screen should be visible first
  expect(screen.getByText(/welcome to verta/i)).toBeInTheDocument();
  
  // Create a new project to proceed
  await user.click(screen.getByRole("button", { name: /create new project/i }));

  expect(screen.getByRole("heading", { name: /verta/i })).toBeInTheDocument();

  expect(screen.getByRole("navigation", { name: /files/i })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: /editor/i })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: /assistant/i })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: /preview/i })).toBeInTheDocument();
});

test("can create a file and switch active file", async () => {
  const user = userEvent.setup();
  render(<App />);

  // Create a new project first
  await user.click(screen.getByRole("button", { name: /create new project/i }));

  await user.click(screen.getByRole("button", { name: /add/i }));
  const dialog = screen.getByRole("dialog", { name: /new file/i });
  await user.type(within(dialog).getByLabelText(/file name/i), "main.tex");
  await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

  expect(screen.getByRole("button", { name: /main\.tex/i })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /main\.tex/i }));

  expect(screen.getByRole("button", { name: /main\.tex/i })).toHaveClass("active");
});
