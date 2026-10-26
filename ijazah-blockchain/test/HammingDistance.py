# Script Kalkulator Avalanche Effect (Hamming Distance)

def hex_to_bin(hex_str):
    # Konversi Hex ke Biner 256-bit
    return bin(int(hex_str, 16))[2:].zfill(256)

def calculate_avalanche(hash_original, hash_manipulated):
    bin_orig = hex_to_bin(hash_original)
    bin_man = hex_to_bin(hash_manipulated)
    
    # Hitung perbedaan bit (Hamming Distance)
    distance = sum(c1 != c2 for c1, c2 in zip(bin_orig, bin_man))
    percentage = (distance / 256.0) * 100
    
    return distance, percentage

# Data Hash dari Tabel 4.2 kamu
hash_asli = "745c7038a3d1bdf7ae18fb8eac18f474acdfa7c39626202d71efd732a33afbc3"
hash_editedPredikat = "51fca14534381d46cbb9035d3bf33bef449a0375dc89caa6166fa4e9c8ddb6b2"
hash_eof = "248a339a2373c955f1db5887b3cd1e2a5c19f1ddd3c3630f7bd1b5fb90382ca9"
hash_metadata = "dd198b090df38de493ef0b123575fd3293ba6bc53653efe5e082b06bc337a441"

print("=== HASIL UJI AVALANCHE EFFECT ===")

dist1, perc1 = calculate_avalanche(hash_asli, hash_editedPredikat)
print(f"1. hash_editedPredikat : {dist1} bit berubah ({perc1:.2f}%)")

dist2, perc2 = calculate_avalanche(hash_asli, hash_eof)
print(f"2. EOF Append: {dist2} bit berubah ({perc2:.2f}%)")

dist3, perc3 = calculate_avalanche(hash_asli, hash_metadata)
print(f"3. Metadata Author  : {dist3} bit berubah ({perc3:.2f}%)")