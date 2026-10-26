declare module 'js-sha256' {
    export function sha256(data: string | ArrayBuffer | Uint8Array): string;
    export namespace sha256 {
        function sha256(data: string | ArrayBuffer | Uint8Array): string;
    }
}