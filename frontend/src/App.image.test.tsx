import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";

import App from "./App";

test("image upload extracts LaTeX into chat and editor", async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(screen.getByRole("button", { name: /extract latex from image/i })).toBeInTheDocument();

  const fileInput = screen.getByLabelText(/image upload/i) as HTMLInputElement;
  const file = new File(["fake"], "eq.png", { type: "image/png" });

  await user.upload(fileInput, file);

  const messages = screen.getByLabelText(/chat messages/i);
  expect(await within(messages).findByText(/\\alpha \+ \\beta/)).toBeInTheDocument();

  const editor = screen.getByRole("textbox", { name: /editor/i }) as HTMLTextAreaElement;
  expect(editor.value).toContain("\\alpha + \\beta");
});
