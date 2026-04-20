import {firebase} from "../configs/firebase";

const Token_Doc = "Salesmessage/token";
const baseURL = "https://api.salesmessage.com/v1";

interface TokenData {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    updated_at: number;
}


/**
 * Get Token from firebase
 */

export async function getStoredToken() {
    const docRef = firebase.doc(Token_Doc);
    const snap = await docRef.get();
    if (!snap.exists) {
        return null;
    }

    return snap.data();
}

/**
 * Save Token
 */

export async function saveToken(data: TokenData) {
    const docRef = firebase.doc(Token_Doc);
    await docRef.set({
        ...data,
        updatedAt: Date.now(),
    });
}

/**
 * Refresh Token
 */

export async function refreshToken(refresh_token: string) {
    const res = await fetch(`${baseURL}/oauth/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: refresh_token,
            client_id: process.env.SALES_MESSAGE_CLIENT_ID,
            client_secret: process.env.SALES_MESSAGE_CLIENT_SECRET,
        }),
    });

    if(!res.ok){
        const text = await res.text();
        throw new Error(`Failed to refresh token: ${text}`);
    }

    return await res.json();
}
