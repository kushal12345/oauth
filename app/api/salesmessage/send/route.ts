import { NextResponse } from "next/server";
import { salesMessageRequest } from "@/app/components/salesmessage";

export async function POST(req: Request) {
    try {
        const {to, message} = await req.json();

        const result = await salesMessageRequest("messages", {
            method: "POST",
            body: JSON.stringify({
                to,
                message,
            }),
        });

        return NextResponse.json({ success: true, data:result });
    } catch (error) {
        return NextResponse.json({ success: false, message:"error",error },{status:500});
    }
}


export async function GET() {
  try {
    const data = await salesMessageRequest("members");

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err
      },
      { status: 500 }
    );
  }
}