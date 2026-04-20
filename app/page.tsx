"use client";

import { use, useEffect, useState } from "react";

type Post = {
  id: number;
  item: string;
  body: string;
  userId: number;
  createdAt: string;
};

export default function Home() {
  const [data, setData] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* fetching data from api and saving to database */
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const res= await fetch("/api/jsonposts",{
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Error fetching posts: ${res.statusText}`);
        }

        const result = await res.json();
        console.log("API RESPONSE:", result);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  /* fetching data from firebase */

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/jsonposts/read", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Error fetching posts: ${res.statusText}`);
        }

        const result = await res.json();
        console.log("Firebase RESPONSE:", result);
        setData(result.data || []);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  },[]);  
  if (loading) {
    return <div className="p-4">Loading posts...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }
/**fetch members */

  //  useEffect(() => {
  //   fetch("/api/members")
  //     .then((res) => res.json())
  //     .then((data) => setMembers(data.data));
  // }, [members]);


  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Posts</h1>

      {data.length === 0 ? (
        <p>No posts found</p>
      ) : (
        <ul className="space-y-3">
          {data.map((post) => (
            <li key={post.id} className="border p-3 rounded">
              <h2 className="font-semibold">{post.item}</h2>
              <p className="text-sm text-gray-600">{post.body}</p>
              <small className="text-xs text-gray-400">
                User: {post.userId}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}