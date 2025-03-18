namespace Softphone.Helpers
{
    public static class ErrorMessage
    {
        public const string DataError_NoLongerExist = "The requested data no longer exist.";
        public const string DataError_StatusOutdated = "The Status of the requested data is now outdated.";
        public const string EditConcurrencyError = "This data has just been modified by other user. Edit won't proceed.";
        public const string DeleteConstraintError = "This data is in used by the other modules. Delete is not possible.";
    }
}
