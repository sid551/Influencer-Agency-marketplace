import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
}));

vi.mock("@/(auth)/actions", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  startGoogleSignIn: vi.fn(),
}));

import { LoginForm } from "@/app/(auth)/login/login-form";
import { SignupForm } from "@/app/(auth)/signup/signup-form";

describe("Google auth entry points", () => {
  beforeEach(() => {
    navigation.params = new URLSearchParams();
  });

  it("offers Google login and carries a sanitized next path", () => {
    navigation.params = new URLSearchParams({ next: "/creator/campaigns" });
    const { container } = render(<LoginForm />);

    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
    const googleForm = screen
      .getByRole("button", { name: /continue with google/i })
      .closest("form");
    expect(googleForm?.querySelector('input[name="role"]')).toHaveValue("creator");
    expect(googleForm?.querySelector('input[name="next"]')).toHaveValue(
      "/creator/campaigns",
    );
    expect(container.querySelectorAll('input[name="next"]')).toHaveLength(2);
  });

  it("uses the selected signup role for the Google button", () => {
    render(<SignupForm />);

    fireEvent.click(screen.getByRole("radio", { name: /Business/i }));

    const googleButton = screen.getByRole("button", {
      name: /sign up with google/i,
    });
    const googleForm = googleButton.closest("form");
    expect(googleForm?.querySelector('input[name="role"]')).toHaveValue("business");
  });
});
