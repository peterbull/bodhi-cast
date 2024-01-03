import { render, act } from "@testing-library/react";
import App from "./App";

test("renders without crashing", () => {
  const { container } = render(<App />);
  expect(container).toBeInTheDocument();
});

test("calls fetch with the correct url when rendered", async () => {
  const fakeResponse = [
    { id: 1, name: "Spot 1" },
    { id: 2, name: "Spot 2" },
  ];
  fetchMock.mockResponseOnce(JSON.stringify(fakeResponse));

  render(<App />);

  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith("http://localhost:8000/spots");
});
