using System.Reflection;
using Newtonsoft.Json.Serialization;
using Newtonsoft.Json;

namespace Softphone.Frontend.Helpers
{
    public static class CommonHelper
    {
        public static IList<string> ConstantList(Type type, bool withBlank)
        {
            var list = new List<string>();
            foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.Static))
                list.Add(field.GetValue(field.Name).ToString());

            if (withBlank) list.Insert(0, string.Empty);
            return list;
        }

        public static string EncryptHash(string value)
        {
            string salt = BCrypt.Net.BCrypt.GenerateSalt(12);
            return BCrypt.Net.BCrypt.HashPassword(value, salt);
        }

        public static bool EncryptVerify(string text, string hash)
        {
            return BCrypt.Net.BCrypt.Verify(text, hash);
        }

        public static string JsonSerialize(object value)
        {
            var settings = new JsonSerializerSettings { ContractResolver = new CamelCasePropertyNamesContractResolver() };
            return JsonConvert.SerializeObject(value, settings);
        }

        public static T JsonDeserialize<T>(string json)
        {
            var settings = new JsonSerializerSettings { ContractResolver = new CamelCasePropertyNamesContractResolver() };
            return JsonConvert.DeserializeObject<T>(json, settings);
        }
    }
}