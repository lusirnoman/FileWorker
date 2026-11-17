<script setup lang="ts">
import { onBeforeMount, ref, type Ref } from 'vue';
import { formatBytes } from '@/utils/utils';
import { DeleteFile, ListFiles } from '@/api';
import type { _Object } from '@aws-sdk/client-s3';
import QRCode from 'qrcode';

let uploadedFiles: Ref<_Object[]> = ref([]);
const qrUrl = ref('');
const qrImage = ref('');
const qrError = ref(false);

const showQr = async (key: string) => {
    qrUrl.value = new URL(`/${key}`, window.location.origin).href;
    qrImage.value = '';
    qrError.value = false;
    try {
        const url = qrUrl.value;
        const image = await QRCode.toDataURL(url, { width: 320, margin: 4 });
        if (qrUrl.value === url) qrImage.value = image;
    } catch {
        qrError.value = true;
    }
};

const closeQr = () => { qrUrl.value = ''; qrImage.value = ''; };

function decodeKey(key: string) {
    return decodeURIComponent(key)
}

const refreshFiles = async () => {
    const res = await ListFiles();
    if (res.hasOwnProperty('Contents') && res.Contents) {
        uploadedFiles.value = res.Contents;
    } else {
        uploadedFiles.value = [];
    }
};

onBeforeMount(async () => {
    await refreshFiles();
});

const onDeleteFileClick = async (key?: string) => {
    if (!key) {
        return;
    }
    await DeleteFile(key);
    await refreshFiles();
};
</script>

<template>
    <div class="flex flex-col items-center mt-5">
        <h1 class="text-lg">{{ $t("page_title.filemanage") }}</h1>
        <div class="px-4 py-4 max-w-screen-md w-4/5">
            <div v-for="file in uploadedFiles" :key="file.Key"
                class="w-full flex flex-row items-center mt-4 rounded border-1 border-gray-300 px-2 py-1">
                <div class="w-10 h-10 i-mdi-file-document-outline"></div>
                <div class="flex flex-col title">
                    <a class="text-lg font-semibold" :title="decodeKey(file.Key!)" :href="`/${file.Key}`" target="_blank">{{ decodeKey(file.Key!) }}</a>
                    <div class="text-sm text-gray">{{ formatBytes(file.Size ?? 0) }}</div>
                </div>
                <button class="ml-auto mr-3" type="button" @click="showQr(file.Key!)">{{ $t('common.qr') }}</button>
                <div class="w-6 h-6 i-mdi-trash-can-outline cursor-pointer"
                    @click="onDeleteFileClick(file.Key)"></div>
            </div>
        </div>
        <div v-if="qrUrl" class="qr-overlay" @click.self="closeQr">
            <div class="qr-dialog" role="dialog" aria-modal="true" :aria-label="$t('common.qr')">
                <h2>{{ $t('common.qr') }}</h2>
                <img v-if="qrImage" :src="qrImage" :alt="$t('common.qr')" width="320" height="320" />
                <p v-if="qrError">{{ $t('common.qr_error') }}</p>
                <a :href="qrUrl" target="_blank" rel="noopener">{{ qrUrl }}</a>
                <p>{{ $t('common.qr_private') }}</p>
                <button type="button" @click="closeQr">{{ $t('common.close') }}</button>
            </div>
        </div>
    </div>
</template>

<style>
html,
body,
#app {
    margin: 0;
    padding: 0;
    background-color: #f8f9fa;
}
.title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.qr-overlay { position: fixed; inset: 0; background: #0008; display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 10; }
.qr-dialog { background: white; border-radius: 8px; padding: 1.5rem; max-width: 380px; width: 100%; text-align: center; overflow-wrap: anywhere; }
.qr-dialog img { max-width: 100%; height: auto; margin: auto; }
.qr-dialog button { margin-top: 1rem; }
</style>
