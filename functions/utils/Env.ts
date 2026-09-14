interface Env extends Partial<Pick<FileWorkerBindings, "BUCKET_BINDING">> {
    REGION?: string,
    ENDPOINT: string,
    BUCKET: string,
    ACCESS_KEY_ID: string,
    SECRET_ACCESS_KEY: string,
    PASSWORD?: string,
}

export default Env;
