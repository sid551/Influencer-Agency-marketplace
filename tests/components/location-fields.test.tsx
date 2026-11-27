import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useForm } from "react-hook-form";

import { StepFields } from "@/app/creator/onboarding/step-fields";
import { Form } from "@/components/ui/form";
import type { OnboardingValues } from "@/lib/validations/onboarding";

function LocationStep() {
  const form = useForm<OnboardingValues>({
    defaultValues: { city: "", state: "" },
  });
  return (
    <Form {...form}>
      <form>
        <StepFields step={4} form={form} />
      </form>
    </Form>
  );
}

/** Opens the given combobox and types a search term into it. */
function searchIn(fieldLabel: "State" | "City", query: string) {
  fireEvent.click(screen.getByRole("combobox", { name: fieldLabel }));
  const search = screen.getByRole("textbox", { name: /search/i });
  fireEvent.change(search, { target: { value: query } });
}

function optionLabels(): string[] {
  return screen
    .getAllByRole("option")
    .map((option) => option.textContent?.trim() ?? "");
}

describe("onboarding location step", () => {
  it("keeps the city field disabled until a state is chosen", () => {
    render(<LocationStep />);

    expect(screen.getByRole("combobox", { name: "City" })).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "State" }),
    ).toBeEnabled();
  });

  it("filters states while typing", () => {
    render(<LocationStep />);

    searchIn("State", "maha");
    expect(optionLabels()).toContain("Maharashtra");
    expect(optionLabels()).not.toContain("Karnataka");
  });

  it("offers only cities from the selected state", () => {
    render(<LocationStep />);

    searchIn("State", "maha");
    fireEvent.click(screen.getByRole("option", { name: "Maharashtra" }));

    const cityTrigger = screen.getByRole("combobox", { name: "City" });
    expect(cityTrigger).toBeEnabled();
    expect(screen.getByText("Cities in Maharashtra. Don't see yours? Type it.")).toBeInTheDocument();

    searchIn("City", "mum");
    const labels = optionLabels();
    expect(labels).toContain("Mumbai");
    expect(labels).not.toContain("Bengaluru");
  });

  it("clears a city that no longer matches a newly picked state", () => {
    render(<LocationStep />);

    searchIn("State", "maha");
    fireEvent.click(screen.getByRole("option", { name: "Maharashtra" }));
    searchIn("City", "mum");
    fireEvent.click(screen.getByRole("option", { name: "Mumbai" }));

    expect(screen.getByRole("combobox", { name: "City" })).toHaveTextContent(
      "Mumbai",
    );

    searchIn("State", "karnataka");
    fireEvent.click(screen.getByRole("option", { name: "Karnataka" }));

    const cityTrigger = screen.getByRole("combobox", { name: "City" });
    expect(cityTrigger).toHaveTextContent("Search your city…");
    expect(cityTrigger).not.toHaveTextContent("Mumbai");
  });

  it("still lets the user keep a value that is not in the list", () => {
    render(<LocationStep />);

    searchIn("State", "maha");
    fireEvent.click(screen.getByRole("option", { name: "Maharashtra" }));

    searchIn("City", "a-tiny-village");
    fireEvent.click(screen.getByRole("option", { name: /use/i }));

    expect(screen.getByRole("combobox", { name: "City" })).toHaveTextContent(
      "a-tiny-village",
    );
  });
});
