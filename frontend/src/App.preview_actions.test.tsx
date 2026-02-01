import { render, screen, waitFor } from "@testing-library/react";
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
  "download button is disabled until preview exists, then triggers download",
  async () => {
  const user = userEvent.setup();
  render(<App />);

  const download = screen.getByRole("button", { name: /download preview/i });
  expect(download).toBeDisabled();

  await createTexFileWithContent(user, "\\documentclass{article}\n\\begin{document}Hi\\end{document}");

  // Compile to create previewUrl (MSW returns a PDF blob).
  await user.click(screen.getByRole("button", { name: /^compile$/i }));

  // Download should now be enabled and should click an anchor.
  const clickSpy = vi.fn();
  const createElSpy = vi.spyOn(document, "createElement").mockImplementation((tag: any) => {
    const el = document.createElementNS("http://www.w3.org/1999/xhtml", tag) as any;
    if (tag === "a") el.click = clickSpy;
    return el;
  });

  await waitFor(() => expect(download).not.toBeDisabled(), { timeout: 8000 });
  await user.click(download);

  expect(clickSpy).toHaveBeenCalled();
  createElSpy.mockRestore();
  },
  10000,
);

test("overflow menu supports fullscreen and open in new window", async () => {
  const user = userEvent.setup();
  render(<App />);

  await createTexFileWithContent(user, "\\documentclass{article}\n\\begin{document}Hi\\end{document}");

  await user.click(screen.getByRole("button", { name: /^compile$/i }));

  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  // Mock fullscreen on the preview container.
  const fsSpy = vi.fn().mockResolvedValue(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Element.prototype as any).requestFullscreen = fsSpy;

  await user.click(screen.getByRole("button", { name: /more actions/i }));
  await user.click(screen.getByRole("menuitem", { name: /open in new window/i }));
  expect(openSpy).toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: /more actions/i }));
  await user.click(screen.getByRole("menuitem", { name: /full screen/i }));
  expect(fsSpy).toHaveBeenCalled();

  openSpy.mockRestore();
});
