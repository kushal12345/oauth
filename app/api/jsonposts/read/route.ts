import { NextResponse } from "next/server";
import { firebase } from "@/app/configs/firebase";

export async function GET() {
    try {

        /** Fetches all data from database */
        const snapshot = await firebase.collection("JsonPosts").get();

        const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ data });

        /** paginated data */

    //     const { searchParams } = new URL(req.url);
    //     const limit = Number(searchParams.get("limit") || 10);
    //     const cursor = searchParams.get("cursor"); // last doc id

    //     let query = adminDB
    //     .collection("JsonPosts")
    //     .orderBy("createdAt", "desc")
    //     .limit(limit);

    //     // cursor handling
    //     if (cursor) {
    //     const cursorDoc = await adminDB
    //         .collection("JsonPosts")
    //         .doc(cursor)
    //         .get();

    //     if (cursorDoc.exists) {
    //         query = query.startAfter(cursorDoc);
    //     }
    //     }

    //     const snapshot = await query.get();

    //     const data = snapshot.docs.map((doc) => ({
    //     id: doc.id,
    //     ...doc.data(),
    //     }));

    //     const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    //     return NextResponse.json({
    //     data,
    //     nextCursor: lastDoc ? lastDoc.id : null,
    // });
    } catch (error) {
        console.error("Error fetching posts:", error);
        return NextResponse.json(
            { message: "Failed to fetch posts" },
            { status: 500 }
        );
    }
}