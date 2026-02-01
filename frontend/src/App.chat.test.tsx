import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";

import App from "./App";

async function createTexFileWithContent(user: ReturnType<typeof userEvent.setup>, content: string) {
  await user.click(screen.getByRole("button", { name: /add/i }));
  const dialog = screen.getByRole("dialog", { name: /new file/i });
  await user.type(within(dialog).getByLabelText(/file name/i), "main.tex");
  await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

  const fileButton = await screen.findByRole("button", { name: /main\.tex/i });
  await user.click(fileButton);
  const editor = screen.getByRole("textbox", { name: /editor/i }) as HTMLTextAreaElement;
  await user.clear(editor);
  await user.type(editor, content);
}

test(
  "assistant chat sends a message and receives a response",
  async () => {
  const user = userEvent.setup();
  render(<App />);

  await createTexFileWithContent(user, "\\section{Intro}\nHello");

  const input = screen.getByLabelText(/ask anything/i);
  await user.type(input, "Add citations where necessary");
  await user.click(screen.getByRole("button", { name: /send/i }));

  const messages = screen.getByLabelText(/chat messages/i);
  expect(within(messages).getByText("Add citations where necessary")).toBeInTheDocument();
  expect(await within(messages).findByText(/edit:/i)).toBeInTheDocument();
  },
  10000,
);

test(
  "assistant shows a proposed changes summary after response",
  async () => {
  const user = userEvent.setup();
  render(<App />);

  await createTexFileWithContent(user, "\\section{Intro}\nHello");

  await user.type(screen.getByLabelText(/ask anything/i), "Add citations");
  await user.click(screen.getByRole("button", { name: /send/i }));

  const proposed = await screen.findByRole("button", { name: /proposed changes/i });
  expect(proposed).toBeInTheDocument();
  const proposedCard = proposed.closest(".proposed");
  expect(proposedCard).not.toBeNull();
  if (proposedCard) {
    expect(within(proposedCard).getByText(/main\.tex/i)).toBeInTheDocument();
    expect(within(proposedCard).getByRole("button", { name: /apply changes/i })).toBeInTheDocument();
  }
  },
  10000,
);
