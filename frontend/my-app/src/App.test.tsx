import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import App from "./App";
import "jest-canvas-mock";

global.fetch = jest.fn() as jest.Mock;

describe("main page smoke tests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders the app component", async () => {
    // Mock the fetch responses
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([{ id: 1, name: "Test Spot" }]),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("main-app-content")).toBeInTheDocument();
    });
  });
});
