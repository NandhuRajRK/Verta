import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";

test("settings modal lists local models and saves doc models", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /settings/i }));
  expect(screen.getByRole("dialog", { name: /settings/i })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /integrations/i }));
  await user.click(screen.getByRole("button", { name: /refresh local models/i }));
  expect(await screen.findByText(/m1\.gguf/i)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /save doc models/i }));
  expect(await screen.findByText(/models saved/i)).toBeInTheDocument();
});
