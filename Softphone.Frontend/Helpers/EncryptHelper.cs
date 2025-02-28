namespace Softphone.Helpers
{
    public static class EncryptHelper
    {
        public static string Hash(string value)
        {
            string salt = BCrypt.Net.BCrypt.GenerateSalt(12);
            return BCrypt.Net.BCrypt.HashPassword(value, salt);
        }

        public static bool Verify(string text, string hash)
        {
            return BCrypt.Net.BCrypt.Verify(text, hash);
        }
    }
}
