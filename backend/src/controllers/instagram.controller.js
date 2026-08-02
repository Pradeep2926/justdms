import axios from "axios";
import { supabase } from "../supabaseClient.js";

export const getInstagramPosts = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get connected IG account
    const { data: ig, error } = await supabase
      .from("instagram_accounts")
      .select("instagram_account_id, page_access_token")
      .eq("user_id", userId)
      .single();

    if (error || !ig) {
      return res.status(400).json({ error: "Instagram not connected" });
    }

    const url = `https://graph.facebook.com/v19.0/${ig.instagram_account_id}/media`;

    const response = await axios.get(url, {
      params: {
        fields:
          "id,caption,media_type,media_url,thumbnail_url,permalink",
        access_token: ig.page_access_token,
      },
    });

    res.json(response.data.data);
  } catch (err) {
    console.error(
      "FETCH POSTS ERROR:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Failed to fetch Instagram posts" });
  }
};
