import { getStoredToken, saveToken, refreshToken } from "@/app/components/oauth";


const baseURL = "https://api.salesmessage.com/v1";

/**
 * Get valid access token
 */

export async function getValidAccessToken() {
    const token = await getStoredToken();

    if(!token) {
        throw new Error("No token Found Run oAuth first");
    }

    const now = Date.now();

    if(token.expires_in && token.expires_in  > now + 60000) {
        return token.access_token;
    }

    const refreshed = await refreshToken(token.refresh_token);

    const newToken = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || token.refresh_token,
        expires_in: now + refreshed.expires_in * 1000,
        updated_at: now,
    }

    await saveToken(newToken);

    return newToken.access_token;
}

export async function salesMessageRequest(
    endpoint: string,
    options: RequestInit = {}
){
    let token = await getValidAccessToken();

    const request = async (t:string) => 
        fetch(`${baseURL}/${endpoint}`, {
            ...options,
            method: options.method || "GET",
            headers: {
                "Authorization": `Bearer ${t}`,
                "Content-Type": "application/json",
                ...options.headers,
            },
        });
        let res = await request(token);

        /**
         * Retry once if expired
         */

        if(res.status === 401){
            token = await getValidAccessToken();
            res = await request(token);
        }

        return res.json();
}