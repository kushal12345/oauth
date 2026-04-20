import { NextResponse } from "next/server";
import { writeBatch, doc, collection } from "firebase/firestore"
import { firebase } from "@/app/configs/firebase";

interface Post {
  id: number;
  item: string;
  body: string;
  userId: number;
}

interface TransformedPost {
  id: number;
  item: string;
  body: string;
  userId: number;
  createdAt: Date;
}

export async function GET() {
    try {
        const res = await fetch(`https://jsonplaceholder.typicode.com/posts`);

        if (!res.ok) {
            console.error("Error fetching posts:", res.statusText);
            return NextResponse.json(
                { message: "Failed to fetch posts" },
                { status: res.status }
            );
        };

        const posts: Post[] = await res.json();


        const transformedPosts: TransformedPost[] = posts.map((item :Post)=>({
            id: item.id,
            item: item.body,
            body: item.body,
            userId: item.userId,
            createdAt: new Date(),
            }));
        /* clientfirebase  */
        // if(transformedPosts?.length > 0){
        //     const batch = writeBatch(firebase);
        //     transformedPosts.forEach((record)=>{
        //         const docRef = doc(collection(firebase, "JsonPosts"), record?.id.toString());

        //         batch.set(docRef, {
        //             ...record,
        //             createdAt: new Date().toISOString(),
        //         });
        //     })
        //     batch.set(doc(collection(firebase, "JsonPosts"), 'latest'), {
        //         lastSyncedAt: new Date().toISOString(),
        //     });
        //     await batch.commit();
        // }

        const batch = firebase.batch();

        transformedPosts.forEach((record) => {
            const docRef = firebase.collection("JsonPosts").doc(record.id.toString());

            batch.set(docRef, {
                ...record,
                createdAt: new Date().toISOString(),
            });
        });

        const latestRef = firebase.collection("JsonPosts").doc('latest');
        batch.set(latestRef, {
            lastSyncedAt: new Date().toISOString(),
        });
        await batch.commit();

        return NextResponse.json({ message: "Posts fetched and saved", recordsFetched: transformedPosts?.length });
    } catch (error) {
        console.error("API ROUTE ERROR:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}

