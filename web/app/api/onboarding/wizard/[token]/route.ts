import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: { token: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const token = context.params.token;
    const draft = await prisma.onboardingDraft.findUnique({
      where: { token },
      select: {
        token: true,
        schoolInfo: true,
        academicSetup: true,
        feeSetup: true,
        adminSetup: true,
        status: true,
      },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json(draft);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load onboarding draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
