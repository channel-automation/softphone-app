namespace Softphone.Helpers
{
    public static class GlobalHelper
    {
        public static string EncryptHash(string value)
        {
            string salt = BCrypt.Net.BCrypt.GenerateSalt(12);
            return BCrypt.Net.BCrypt.HashPassword(value, salt);
        }

        public static bool EncryptVerify(string text, string hash)
        {
            return BCrypt.Net.BCrypt.Verify(text, hash);
        }
    }
}
