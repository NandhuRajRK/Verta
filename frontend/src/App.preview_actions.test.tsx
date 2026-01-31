import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";

test("download button is disabled until preview exists, then triggers download", async () => {
  const user = userEvent.setup();
  render(<App />);

  const download = screen.getByRole("button", { name: /download preview/i });
  expect(download).toBeDisabled();

  // Compile to create previewUrl (MSW returns a PDF blob).
  await user.click(screen.getByRole("button", { name: /^compile$/i }));

  // Download should now be enabled and should click an anchor.
  const clickSpy = vi.fn();
  const createElSpy = vi.spyOn(document, "createElement").mockImplementation((tag: any) => {
    const el = document.createElementNS("http://www.w3.org/1999/xhtml", tag) as any;
    if (tag === "a") el.click = clickSpy;
    return el;
  });

  expect(download).not.toBeDisabled();
  await user.click(download);

  expect(clickSpy).toHaveBeenCalled();
  createElSpy.mockRestore();
});

test("overflow menu supports fullscreen and open in new window", async () => {
  const user = userEvent.setup();
  render(<App />);

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
