export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import { cookies } from "next/headers";

export async function POST(req: Request) {
	await connectDB();
	try {
        const body = await req.json()
		const cookieStore = cookies();
        const username = (await cookieStore).get("username")?.value;
		const {
			income,
			citizenship,
			householdSize,
			loanType,
			flatType,
			budget,
			area,
			lease
		} = body;

		if (!username) {
			return NextResponse.json({ error: "Username is required." }, { status: 400 });
		}

		// Update user preferences
		const updated = await User.findOneAndUpdate(
			{ username },
			{
				income,
				citizenship,
				householdSize,
				loan: loanType,
				flatType,
				budget,
				area,
				leaseLeft: lease
			},
			{ new: true }
		);

		if (!updated) {
			return NextResponse.json({ error: "User not found." }, { status: 404 });
		}
		return NextResponse.json({ message: "User info updated.", user: updated });
	} catch (err) {
		return NextResponse.json({ error: "Failed to update user info." }, { status: 500 });
	}
}