/*

{
  "data": {
    "id": "MUkssj6",
    "title": null,
    "description": null,
    "datetime": 1668340126,
    "type": "image/png",
    "animated": false,
    "width": 512,
    "height": 512,
    "size": 473831,
    "views": 0,
    "bandwidth": 0,
    "vote": null,
    "favorite": false,
    "nsfw": null,
    "section": null,
    "account_url": null,
    "account_id": 0,
    "is_ad": false,
    "in_most_viral": false,
    "has_sound": false,
    "tags": [],
    "ad_type": 0,
    "ad_url": "",
    "edited": "0",
    "in_gallery": false,
    "deletehash": "hdYnH1gKz9YTHfS",
    "name": "",
    "link": "https://i.imgur.com/MUkssj6.png"
  },
  "success": true,
  "status": 200
}

*/

export type ImgurResponseData = {
  success: boolean;
  status: number;
  data: {
    id: string;
    deletehash: string;
    link: string;
  };
};
