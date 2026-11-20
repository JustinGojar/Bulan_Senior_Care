import { render, screen } from "@testing-library/react";

it("renders text", () => {
  render(<h1>Bulan SeniorCare</h1>);
  expect(screen.getByText("Bulan SeniorCare")).toBeInTheDocument();
});
