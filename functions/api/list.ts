import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import Env from "../utils/Env";
import { createS3Client } from "../utils/utils";


export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env, request } = context;
    const { BUCKET } = env;
    const querys = new URL(request.url).searchParams;
    const maxKeys = querys.get("MaxKeys");
    const prefix = querys.get("Prefix");
    const continuationToken = querys.get("ContinuationToken");

    if (env.BUCKET_BINDING) {
        const limit = maxKeys === null ? 1000 : Number(maxKeys);
        if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
            return new Response("MaxKeys must be between 1 and 1000", { status: 400 });
        }
        const result = await env.BUCKET_BINDING.list({
            limit,
            prefix: prefix ?? undefined,
            cursor: continuationToken ?? undefined,
        });
        return Response.json({
            Contents: result.objects.map(object => ({
                Key: object.key,
                Size: object.size,
                ETag: object.httpEtag,
                LastModified: object.uploaded.toISOString(),
            })),
            KeyCount: result.objects.length,
            IsTruncated: result.truncated,
            NextContinuationToken: result.truncated ? result.cursor : undefined,
        }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const s3 = createS3Client(env);
    const command = new ListObjectsV2Command({
        Bucket: BUCKET!,
        MaxKeys: maxKeys ? parseInt(maxKeys) : undefined,
        Prefix: prefix,
        ContinuationToken: continuationToken
    });
    let response;
    try {
        response = await s3.send(command);
    } catch (e) {
        return new Response("Not found", { status: 404 });
    }
    return new Response(JSON.stringify(response), { status: 200 });
}
